TESTS = test/*.test.js
REPORTER = spec
TIMEOUT = 5000
MOCHA_OPTS =

init: install
	@ln -s -f ../../pre-commit.sh .git/hooks/pre-commit

install:
	@npm install --registry=http://registry.cnpmjs.org --cache=${HOME}/.npm/.cache/cnpm

clean:
	-rm -rf ./run

test: init
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		$(MOCHA_OPTS) \
		$(TESTS)

test-cov:
	@$(MAKE) test MOCHA_OPTS='--require blanket' REPORTER=travis-cov

test-cov-html:
	@rm -f coverage.html
	@$(MAKE) test MOCHA_OPTS='--require blanket' REPORTER=html-cov > coverage.html
	@ls -lh coverage.html

test-coveralls: test
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@-$(MAKE) test MOCHA_OPTS='--require blanket' REPORTER=mocha-lcov-reporter | ./node_modules/coveralls/bin/coveralls.js

test-all: test test-cov

contributors: install
	@./node_modules/contributors/bin/contributors -f plain -o AUTHORS

.PHONY: test
